import { expect, test } from "vitest";
import { CurvyPlan, CurvyPlanSuccessfulExecution, CurvyPlanUnsuccessfulExecution } from "@/planner/plan";
import { executePlan } from "@/planner/planner";
import { mockAddressLike } from "@/planner/commands/mock-commands";

const simpleSerialFail: CurvyPlan = {
  type: "serial",
  items: [
    {
      type: "command",
      name: "mock-success",
      input: mockAddressLike
    },
    {
      type: "command",
      name: "mock-fail",
      input: mockAddressLike
    },
    {
      type: "command",
      name: "mock-success",
      input: mockAddressLike
    }
  ]
};
const simpleSerialSuccess: CurvyPlan = {
  type: "serial",
  items: [
    {
      type: "command",
      name: "mock-success",
      input: mockAddressLike
    },
    {
      type: "command",
      name: "mock-success",
      input: mockAddressLike
    },
    {
      type: "command",
      name: "mock-success",
      input: mockAddressLike
    }
  ]
};
const simpleParallelFail: CurvyPlan = {
  type: "parallel",
  items: [
    {
      type: "command",
      name: "mock-success",
      input: mockAddressLike
    },
    {
      type: "command",
      name: "mock-fail",
      input: mockAddressLike
    },
    {
      type: "command",
      name: "mock-success",
      input: mockAddressLike
    }
  ]
};
const simpleParallelSuccess: CurvyPlan = {
  type: "parallel",
  items: [
    {
      type: "command",
      name: "mock-success",
      input: mockAddressLike
    },
    {
      type: "command",
      name: "mock-success",
      input: mockAddressLike
    },
    {
      type: "command",
      name: "mock-success",
      input: mockAddressLike
    }
  ]
};

test("simple serial fail", async () => {
  const result = await executePlan(simpleSerialFail);

  expect(result.success, "plan should fail if second command failed").toBe(false);
  expect(result.items, "plan should have exactly two items").toHaveLength(2);

  const successfulItem = result.items![0] as CurvyPlanSuccessfulExecution;
  expect(successfulItem.success, "plan should have first item succeed").toBe(true);
  expect(successfulItem.address).toBe(mockAddressLike);

  const unsuccesfulItem = result.items![1] as CurvyPlanUnsuccessfulExecution;
  expect(unsuccesfulItem.success, "plan should have second item fail").toBe(false);
});

test("simple serial success", async () => {
  const result = await executePlan(simpleSerialSuccess);

  expect(result.items, "plan should have exactly three items").toHaveLength(3);

  for (let item of result.items!) {
    item = item as CurvyPlanSuccessfulExecution;
    expect(item.success, "plan should have first item succeed").toBe(true);
    expect(item.address).toBe(mockAddressLike);
  }
});

test("simple parallel fail", async () => {
  const result = await executePlan(simpleParallelFail);

  expect(result.success, "plan should fail if one command failed").toBe(false);
  expect(result.items, "plan should have exactly three items").toHaveLength(3);

  const expectedSuccessState = [true, false, true];
  const actualSuccessState = result.items!.map(item => item.success);

  expect(actualSuccessState, "expected just the middle parallel item to fail").toEqual(expectedSuccessState);
});

test("simple parallel success", async () => {
  const result = await executePlan(simpleParallelSuccess);

  expect(result.success, "plan should succeed if all commands succeeded").toBe(true);
  expect(result.items, "plan should have exactly three items").toHaveLength(3);

  const expectedSuccessState = [true, true, true];
  const actualSuccessState = result.items!.map(item => item.success);

  expect(actualSuccessState, "expected all items to succeed").toEqual(expectedSuccessState);
});

test("complex fail from serial", async () => {
  const plan: CurvyPlan = {
    type: "serial",
    items: [
      {
        type: "parallel",
        items: [
          simpleSerialSuccess,
          simpleSerialSuccess,
          simpleSerialSuccess,
        ]
      },
      {
        type: "command",
        name: "mock-fail",
        input: mockAddressLike
      }
    ]
  }

  const result = await executePlan(plan);

  expect(result.items![0].success, "first item in serial should succeed").toBe(true);
  expect(result.items![0].items, "first item in serial should have three children").toHaveLength(3);

  expect(result.items![1].success, "second item in serial should fail").toBe(false);
  expect(result.success, "plan should fail because serial after parallel failed").toBe(false);
});

test("complex fail from parallel", async () => {
  const plan: CurvyPlan = {
    type: "serial",
    items: [
      {
        type: "parallel",
        items: [
          simpleSerialFail,
          simpleSerialSuccess,
          simpleSerialSuccess,
        ]
      },
      {
        type: "command",
        name: "mock-success",
        input: mockAddressLike
      }
    ]
  }

  const result = await executePlan(plan);

  expect(result.items, "should have length of just parallel that failed").toHaveLength(1);
  expect(result.items![0].success, "first item in serial should fail").toBe(false);
  expect(result.items![0].items, "first item in serial should have three children").toHaveLength(3);

  expect(result.items![0].items![0].success, "first item in parallel should be fail").toBe(false);
  expect(result.items![0].items![1].success, "second item in parallel should be success").toBe(true);
  expect(result.items![0].items![2].success, "second item in parallel should be success").toBe(true);

  expect(result.success, "plan should fail because parallel failed").toBe(false);
});

test("complex fail from both serial and parallel", async () => {
  const plan: CurvyPlan = {
    type: "serial",
    items: [
      {
        type: "parallel",
        items: [
          simpleSerialFail,
          simpleSerialSuccess,
          simpleSerialSuccess,
        ]
      },
      {
        type: "command",
        name: "mock-fail",
        input: mockAddressLike
      }
    ]
  }

  const result = await executePlan(plan);

  expect(result.items![0].success, "parallel should fail").toBe(false);
  expect(result.items![0].items, "first item in serial should have three children").toHaveLength(3);
  const expectedSuccessState = [false, true, true];
  const actualSuccessState = result.items![0].items!.map(item => item.success);
  expect(actualSuccessState, "expected just first parallel item to fail").toEqual(expectedSuccessState);

  expect(result.items, "we should only have one item in result because first one failed").toHaveLength(1);
  expect(result.success, "plan should fail because serial after parallel failed").toBe(false);
});

test("complex success", async () => {
  const plan: CurvyPlan = {
    type: "serial",
    items: [
      {
        type: "parallel",
        items: [
          simpleSerialSuccess,
          simpleSerialSuccess,
          simpleSerialSuccess,
        ]
      },
      {
        type: "command",
        name: "mock-success",
        input: mockAddressLike
      }
    ]
  }

  const result = await executePlan(plan);

  expect(result.items, "we should have two items in top most plan").toHaveLength(2);
  expect(result.items![0].items, "we should have three items in parallel step").toHaveLength(3);

  expect(result.success, "the entire plan should be successful").toBe(true);
  expect(result.items![0].success, "the parallel step should be successful").toBe(true);
  expect(result.items![1].success, "the command step should be successful").toBe(true);

  const expectedSuccessState = [true, true, true];
  const actualSuccessState = result.items![0].items!.map(item => item.success);
  expect(actualSuccessState, "expected all parallel items to succeed").toEqual(expectedSuccessState);
});
