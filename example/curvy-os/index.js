import { getTokenAddress } from "@0xcurvy/curvy-sdk";

const CSUC_ACTIONS = ["withdraw", "transfer", "deposit-to-aggregator"];
//////////////////////////////////////////////////////////////////////////////
//
// GLOBAL FUNCTIONS - Must be added to the window object
//
//////////////////////////////////////////////////////////////////////////////

function showTabContent(tabId) {
  // Hide all tab content
  for (const tab of document.querySelectorAll('.window[role="tabpanel"] > .window-body')) {
    tab.style.visibility = "hidden";
    tab.style.display = "none";
  }
  // Set all tabs as inactive

  for (const tabItem of document.querySelectorAll("li[role='tab']")) {
    tabItem.setAttribute("aria-selected", "false");
  }

  // Show the active tab and set it as active
  document.getElementById(tabId).style.visibility = "visible";
  document.getElementById(tabId).style.removeProperty("display");

  for (const tab of document.querySelectorAll(`[data-tab-id="${tabId}"]`)) {
    tab.setAttribute("aria-selected", "true");
  }

  // Hide all sub tab content except the first one
  for (const _tab of document.querySelectorAll('.window[role="tabpanel"] > .window-body')) {
    for (const [index, subTab] of document.querySelectorAll("div[role='sub-tab-content']").entries()) {
      subTab.setAttribute("aria-selected", "false");
      subTab.style.visibility = "hidden";
      subTab.style.removeProperty("display");
      subTab.style.display = "none";
      if (index !== 0) continue;

      // Only the first sub tab should be visible
      subTab.style.visibility = "visible";
      subTab.setAttribute("aria-selected", "true");
      subTab.style.display = "block";
    }
  }
}

window.showTabContent = showTabContent;

function showSubTabContent(tabId, subTabId) {
  showTabContent(tabId);

  // Hide all sub tab content
  for (const tab of document.querySelectorAll('.window[role="tabpanel"] > .window-body')) {
    if (tab.id !== tabId) continue;
    // Set all sub tabs as inactive
    for (const subTab of document.querySelectorAll("div[role='sub-tab-content']")) {
      subTab.setAttribute("aria-selected", "false");
      subTab.style.visibility = "hidden";
      subTab.style.display = "none";

      if (subTab.id !== subTabId) continue;

      // Only the selected sub tab should be visible
      subTab.setAttribute("aria-selected", "true");
      subTab.style.visibility = "visible";
      subTab.style.display = "block";
    }
  }
}

window.showSubTabContent = showSubTabContent;

function addEventRow(eventType, data) {
  const tableBody = document.getElementById("eventsTable").tBodies[0];
  const newRow = tableBody.insertRow();

  const timestampCell = newRow.insertCell(0);
  const now = new Date(Date.now());
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  timestampCell.textContent = formattedTime;

  const eventTypeCell = newRow.insertCell(1);
  eventTypeCell.textContent = eventType;

  const dataCell = newRow.insertCell(2);
  dataCell.textContent = data;
}

function openAddWalletWindow() {
  document.getElementById("register").style.display = "block";
}

window.openAddWalletWindow = openAddWalletWindow;

function closeAddWalletWindow() {
  document.getElementById("register").style.display = "none";
}
window.closeAddWalletWindow = closeAddWalletWindow;

function addAnnouncementRow(announcement) {
  const newTotalAnnouncements = Number.parseInt(document.getElementById("totalAnnouncements").textContent, 10) + 1;
  document.getElementById("totalAnnouncements").textContent = newTotalAnnouncements;
  const tableBody = document.getElementById("announcementsTable").tBodies[0];
  const newRow = tableBody.insertRow();

  if (!announcement) {
    return;
  }

  const idCell = newRow.insertCell(0);
  idCell.textContent = announcement.id;

  const createdAtCell = newRow.insertCell(1);
  createdAtCell.textContent = announcement.createdAt;

  const networkCell = newRow.insertCell(2);
  const network = window.curvySDK.getNetworks(announcement.network_id);
  if (network[0]) {
    networkCell.textContent = network[0].name;
  }

  const viewTagCell = newRow.insertCell(3);
  viewTagCell.textContent = announcement.viewTag;
}

function getSDKConfiguration() {
  // Helper function to get the query parameters from the URL
  function getQueryParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  // Override the defaults with query parameters (if provided)
  const apiBaseUrl = getQueryParameter("apiBaseUrl");
  const apiKey = getQueryParameter("apiKey");
  const network = getQueryParameter("network") || "mainnets";

  return { apiKey, apiBaseUrl, network };
}

window.getSDKConfiguration = getSDKConfiguration;

function handleSDKConfigurationChange() {
  const apiUrl = document.getElementById("sdk-api-url").value;
  const apiKey = document.getElementById("sdk-api-key").value;
  const network = document.getElementById("sdk-network").value;

  const queryParams = new URLSearchParams({
    apiBaseUrl: apiUrl,
    apiKey: apiKey,
    network: network,
  }).toString();

  const currentUrl = new URL(window.location.href);
  currentUrl.search = queryParams;
  window.history.replaceState(null, "", currentUrl);
}

window.handleSDKConfigurationChange = handleSDKConfigurationChange;

function saveSDKConfiguration() {
  window.location.reload();
}

window.saveSDKConfiguration = saveSDKConfiguration;

async function signInWithMetamask() {
  document.body.style.cursor = "wait";

  if (!window.ethereum) {
    alert("Metamask not installed!");
    return;
  }

  const provider = window.ethereum;

  // Request account access
  const accounts = await provider.request({
    method: "eth_requestAccounts",
  });

  const ownerAddress = accounts[0];
  const password = prompt("Please enter password");

  // Prompt eth_signTypedData
  const signingObject = await window.curvySDK.getSignatureParamsForNetworkFlavour("evm", ownerAddress, password);
  const params = [ownerAddress, JSON.stringify(signingObject)];

  const rawSignature = await window.ethereum.request({
    method: "eth_signTypedData_v4",
    params,
  });

  await window.curvySDK.addWalletWithSignature("evm", {
    signatureResult: rawSignature,
    signatureParams: signingObject,
    signingAddress: ownerAddress,
  });

  closeAddWalletWindow();

  document.body.style.cursor = "auto";
}

window.signInWithMetamask = signInWithMetamask;

async function signInWithStarknetWallet(walletId) {
  let wallet;
  if (walletId === "argentX") {
    wallet = window.starknet_argentX;
  } else if (walletId === "braavos") {
    wallet = window.starknet_braavos;
  }

  if (wallet === undefined) {
    throw new Error(`Error connecting to Starknet wallet: ${walletId}`);
  }

  await wallet.enable();

  const ownerAddress = wallet.account.address;

  const pubKey = await wallet.account.signer.getPubKey();

  const password = prompt("Please enter password");

  const signingObject = await window.curvySDK.getSignatureParamsForNetworkFlavour("starknet", ownerAddress, password);
  const msgHash = await wallet.account.hashMessage(signingObject);

  const signature = await wallet.account.signMessage(signingObject);

  await window.curvySDK.addWalletWithSignature("starknet", {
    signatureResult: signature,
    signingWalletId: walletId,
    signingPublicKey: pubKey,
    signingAddress: ownerAddress,
    signatureParams: signingObject,
    msgHash,
  });

  closeAddWalletWindow();
}

window.signInWithStarknetWallet = signInWithStarknetWallet;

// TOOD: Maybe this also in Curvy utils
function shortenAddress(address) {
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

async function populateWalletsTree() {
  let totalBalance = 0;
  const walletsTree = document.getElementById("wallets");
  const hideZeroBalances = document.getElementById("hideZeroBalances").checked;

  walletsTree.innerHTML = "";

  const wallets = window.curvySDK.wallets;

  if (wallets.length === 0) {
    walletsTree.innerHTML = `<li>
                                <img src="https://win98icons.alexmeub.com/icons/png/catalog_no-1.png" alt="No Wallets Icon"
                                     style="width: 12px; height: 12px; margin-right: 4px">
                                    <i>No wallets registered</i>
                            </li>`;
    return;
  }

  for (const wallet of wallets) {
    // Create a new list item for `lazar.curvy.name`
    const listItem = document.createElement("li");
    const details = document.createElement("details");
    details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = wallet.curvyHandle || `(unregistered ${shortenAddress(wallet.ownerAddress)})`;
    details.appendChild(summary);

    // --------------------------------------- Legacy CSA

    const legacy = document.createElement("h5");
    legacy.textContent = "Legacy:";
    details.appendChild(legacy);

    let ul = document.createElement("ul");
    for (const stealthAddress of await window.curvySDK.storage.getCurvyAddressesByWalletId(wallet.id)) {
      const li = document.createElement("li");
      li.textContent = shortenAddress(stealthAddress.address);

      const balances = document.createElement("ul");

      for (const [networkSlug, tokens] of Object.entries(stealthAddress.balances)) {
        const network = window.curvySDK.getNetworkBySlug(networkSlug);
        for (const [
          symbol,
          {
            balance,
            tokenMeta: { decimals },
          },
        ] of Object.entries(tokens)) {
          const balanceElem = document.createElement("li");

          const currency = network.currencies.find((c) => c.symbol === symbol);

          balanceElem.className = "balance";
          balanceElem.setAttribute("onclick", "selectLegacyStealthAddress.call(this)");
          balanceElem.dataset.address = stealthAddress.address;
          balanceElem.dataset.id = stealthAddress.id;
          balanceElem.dataset.network = network.name;
          balanceElem.dataset.currency = symbol;

          const formattedBalance = prettyPrintBalance(balance, decimals, 6);
          balanceElem.textContent = `${formattedBalance} ${symbol}@${network.name}`;
          balances.appendChild(balanceElem);
          totalBalance += Number(formattedBalance) * currency.price;
        }
      }

      if (!hideZeroBalances || Object.keys(stealthAddress.balances).length > 0) {
        ul.appendChild(li);
        ul.appendChild(balances);
      }
    }

    details.appendChild(ul);

    // --------------------------------------- CSUC CSA

    const csucCSA = document.createElement("h5");
    csucCSA.textContent = "CSUC:";
    details.appendChild(csucCSA);

    ul = document.createElement("ul");
    for (const stealthAddress of await window.curvySDK.storage.getCurvyAddressesByWalletId(wallet.id)) {
      const li = document.createElement("li");
      li.textContent = shortenAddress(stealthAddress.address);

      const balances = document.createElement("ul");

      for (const [networkSlug, tokens] of Object.entries(stealthAddress.csuc.balances)) {
        const network = window.curvySDK.getNetworkBySlug(networkSlug);
        for (const [
          symbol,
          {
            balance,
            tokenMeta: { decimals },
          },
        ] of Object.entries(tokens)) {
          const balanceElem = document.createElement("li");

          const currency = network.currencies.find((c) => c.symbol === symbol);

          balanceElem.className = "balance";
          balanceElem.setAttribute("onclick", "selectCSUCStealthAddress.call(this)");
          balanceElem.dataset.address = stealthAddress.address;
          balanceElem.dataset.id = stealthAddress.id;
          balanceElem.dataset.network = network.name;
          balanceElem.dataset.currency = currency.symbol;

          const formattedBalance = prettyPrintBalance(balance, decimals, 6);
          balanceElem.textContent = `${formattedBalance} ${symbol}@${network.name}`;
          balances.appendChild(balanceElem);
          totalBalance += Number(formattedBalance) * currency.price;
        }
      }

      if (!hideZeroBalances || Object.keys(stealthAddress.csuc.balances).length > 0) {
        ul.appendChild(li);
        ul.appendChild(balances);
      }
    }

    details.appendChild(ul);

    // --------------------------------------- TODO: Aggregator

    listItem.appendChild(details);
    walletsTree.appendChild(listItem);
  }
  document.getElementById("totalBalance").textContent = `$${totalBalance.toFixed(2)}`;
}
window.populateWalletsTree = populateWalletsTree;

window.populateWalletsTree = populateWalletsTree;

function selectLegacyStealthAddress() {
  const selectedBalances = document.querySelectorAll("li.balance.selected");

  for (const balance of selectedBalances) {
    balance.classList.remove("selected");
  }

  this.classList.add("selected");

  document.getElementById("estimate-fee").disabled = false;

  const address = this.dataset.address;
  const network = this.dataset.network;
  const currency = this.dataset.currency;

  const fromAddressInput = document.getElementById("fromAddress");
  fromAddressInput.value = address;

  const currencyInput = document.getElementById("currency");
  currencyInput.value = currency;

  const networkInput = document.getElementById("network");
  networkInput.value = network;

  const csucFromAddressInput = document.getElementById("csuc-onboard-fromAddress");
  csucFromAddressInput.value = address;

  const csucCurrencyInput = document.getElementById("csuc-onboard-currency");
  csucCurrencyInput.value = currency;

  const csucNetworkInput = document.getElementById("csuc-onboard-network");
  csucNetworkInput.value = network;

  window.selectedAddressId = this.dataset.id;
}

window.selectLegacyStealthAddress = selectLegacyStealthAddress;

function selectCSUCStealthAddress() {
  const selectedBalances = document.querySelectorAll("li.balance.selected");

  for (const balance of selectedBalances) {
    balance.classList.remove("selected");
  }

  this.classList.add("selected");

  document.getElementById("estimate-fee").disabled = false;

  const address = this.dataset.address;
  const network = this.dataset.network;
  const currency = this.dataset.currency;

  for (const action of CSUC_ACTIONS) {
    document.getElementById(`csuc-${action}-fromAddress`).value = address;
    document.getElementById(`csuc-${action}-currency`).value = currency;
    document.getElementById(`csuc-${action}-network`).value = network;
  }

  window.selectedCsucAddressId = this.dataset.id;
}

window.selectCSUCStealthAddress = selectCSUCStealthAddress;

// TODO: move to SDK
function prettyPrintBalance(amount, decimals, precision = 2) {
  if (typeof amount !== "bigint") {
    throw new TypeError("amount must be a BigInt");
  }

  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  // Get fractional part as string with padding
  let fractionStr = ((fraction * BigInt(10 ** precision)) / divisor).toString().padStart(precision, "0");

  // Trim trailing zeros from fractional part
  fractionStr = fractionStr.replace(/0+$/, "");

  return fractionStr.length > 0 ? `${whole.toString()}.${fractionStr}` : whole.toString();
}

async function refreshBalances() {
  document.body.style.cursor = "wait";

  await window.curvySDK.refreshBalances();

  await populateWalletsTree();

  document.body.style.cursor = "auto";
}

window.refreshBalances = refreshBalances;

async function estimateFee() {
  // Disable when we start estimating
  document.getElementById("estimate-fee").disabled = true;
  document.body.style.cursor = "wait";

  const stealthAddress = await window.curvySDK.getStealthAddressById(window.selectedAddressId);

  const toAddress = document.getElementById("toAddress").value;
  const network = document.getElementById("network").value;
  const amount = document.getElementById("amount").value;
  const currency = document.getElementById("currency").value;

  const fee = await window.curvySDK.estimateFee(stealthAddress, network, toAddress, amount, currency);
  window.curvyEstimatedFee = fee;

  const networkObj = window.curvySDK.getNetwork(network);
  const { decimals } = networkObj.currencies.find((c) => c.native);
  document.getElementById("fee").value = prettyPrintBalance(fee.rawFee, decimals, decimals);

  document.getElementById("estimate-fee").disabled = false;
  document.body.style.cursor = "auto";
  document.getElementById("send").disabled = false;
}

window.estimateFee = estimateFee;

function pollAggregatorStatus(requestId) {
  const statusField = document.getElementById("aggregator-status");

  const interval = setInterval(async () => {
    try {
      const res = await window.curvySDK.getAggregatorRequestStatus(requestId);
      statusField.value = res.status;

      if (["completed", "failed"].includes(res.status)) {
        clearInterval(interval);
      }
    } catch (err) {
      clearInterval(interval);
      statusField.value = "error";
      console.error("Failed to get status:", err);
    }
  }, 3000);
}

async function submitAggregatorRequest() {
  try {
    const mode = document.getElementById("aggregator-mode").value;
    const payloadText = document.getElementById("aggregator-payload").value;
    const payload = JSON.parse(payloadText);
    let response;

    if (mode === "Deposit") {
      response = await window.curvySDK.createDeposit(payload);
    } else if (mode === "Withdraw") {
      response = await window.curvySDK.createWithdraw(payload);
    } else if (mode === "Aggregation") {
      response = await window.curvySDK.createAggregation(payload);
    } else {
      throw new Error("Invalid aggregator mode selected.");
    }

    document.getElementById("aggregator-request-id").value = response.requestId;
    document.getElementById("aggregator-status").value = "";

    pollAggregatorStatus(response.requestId);
  } catch (err) {
    alert(`Aggregator request failed:\n${err.message}`);
  }
}

window.submitAggregatorRequest = submitAggregatorRequest;

async function checkAggregatorStatus() {
  const requestId = document.getElementById("aggregator-request-id").value;
  if (!requestId) {
    alert("No request ID found.");
    return;
  }

  try {
    const res = await window.curvySDK.getAggregatorRequestStatus(requestId);
    document.getElementById("aggregator-status").value = res.status;
  } catch (err) {
    alert(`Status check failed:\n${err.message}`);
  }
}

window.checkAggregatorStatus = checkAggregatorStatus;

async function send() {
  // Disable when we start estimating
  document.getElementById("estimate-fee").disabled = true;
  document.getElementById("send").disabled = true;
  document.body.style.cursor = "wait";

  const stealthAddress = await window.curvySDK.getStealthAddressById(window.selectedAddressId);

  const toAddress = document.getElementById("toAddress").value;
  const network = document.getElementById("network").value;
  const amount = document.getElementById("amount").value;
  const currency = document.getElementById("currency").value;

  const txHash = await window.curvySDK.send(
    stealthAddress,
    network,
    toAddress,
    amount,
    currency,
    window.curvyEstimatedFee,
  );

  document.getElementById("estimate-fee").disabled = false;
  document.body.style.cursor = "auto";

  const networkObj = await window.curvySDK.getNetwork(network);
  window.open(`${networkObj.blockExplorerUrl}/tx/${txHash}`, "_blank");
  alert(`Transaction sent! Tx hash: ${txHash}`);
}

window.send = send;

async function onboardToCSUC() {
  // Disable when we start estimating
  document.getElementById("csuc-onboard-button").disabled = true;
  document.body.style.cursor = "wait";

  const stealthAddress = await window.curvySDK.getStealthAddressById(window.selectedAddressId);

  const toAddress = document.getElementById("csuc-onboard-toAddress").value;
  let network = document.getElementById("csuc-onboard-network").value;
  network = network.replace(/\s+/g, "-").toLowerCase();
  const amount = document.getElementById("csuc-onboard-amount").value;
  const currency = document.getElementById("csuc-onboard-currency").value;

  console.log(
    "Gas Sponsorship Response:",
    await window.curvySDK.onboardToCSUC(stealthAddress, toAddress, currency, amount),
  );

  document.getElementById("csuc-onboard-button").disabled = false;
  document.body.style.cursor = "auto";
}

window.onboardToCSUC = onboardToCSUC;

async function estimateFeeForCSUC(action) {
  if (CSUC_ACTIONS.indexOf(action) === -1) {
    alert("Invalid action specified for CSUC fee estimation!");
    return;
  }

  const estimateButton = document.getElementById(`csuc-${action}-estimate-fee-button`);

  // Disable when we start estimating
  estimateButton.disabled = true;
  document.body.style.cursor = "wait";

  const stealthAddress = await window.curvySDK.getStealthAddressById(window.selectedCsucAddressId);

  const toAddress = document.getElementById(`csuc-${action}-toAddress`).value;
  const network = document.getElementById(`csuc-${action}-network`).value;
  const amount = document.getElementById(`csuc-${action}-amount`).value;
  const currency = document.getElementById(`csuc-${action}-currency`).value;

  const token = getTokenAddress("ethereum-sepolia", currency);

  const { payload, offeredTotalFee } = await window.curvySDK.estimateActionInsideCSUC(
    network,
    action,
    stealthAddress,
    toAddress,
    token,
    amount,
  );

  // TODO: dont't hardcode decimals
  const decimals = 18;
  document.getElementById(`csuc-${action}-fee`).value = prettyPrintBalance(BigInt(offeredTotalFee), decimals, decimals);

  window.pendingActionForCSUC = { payload, offeredTotalFee };

  estimateButton.disabled = false;
  document.body.style.cursor = "auto";
}

window.estimateFeeForCSUC = estimateFeeForCSUC;
window.pendingActionForCSUC = null;

async function executeCSUCAction(action) {
  if (CSUC_ACTIONS.indexOf(action) === -1) {
    alert("Invalid action specified for CSUC execution!");
    return;
  }

  if (!window.pendingActionForCSUC) {
    alert("Estimate the fee first!");
    return;
  }

  const { payload, offeredTotalFee } = window.pendingActionForCSUC;

  document.getElementById(`csuc-${action}-button`).disabled = true;
  document.body.style.cursor = "wait";

  const stealthAddress = await window.curvySDK.getStealthAddressById(window.selectedCsucAddressId);

  const _res = await window.curvySDK.requestActionInsideCSUC(
    "ethereum-sepolia",
    stealthAddress,
    payload,
    offeredTotalFee,
  );

  window.pendingActionForCSUC = null;
  document.getElementById(`csuc-${action}-button`).disabled = false;
  document.body.style.cursor = "auto";
}

window.executeCSUCAction = executeCSUCAction;

async function getNewStealthAddress() {
  document.body.style.cursor = "wait";
  document.getElementById("get-new-stealth-address").disabled = true;
  document.getElementById("stealthAddress").value = "";

  const handle = document.getElementById("handle").value;
  const network = document.getElementById("networkForStealthAddress").value;

  const stealthAddress = (await window.curvySDK.getNewStealthAddressForUser(network, handle)).address;
  document.getElementById("stealthAddress").value = stealthAddress;

  document.body.style.cursor = "auto";
  document.getElementById("get-new-stealth-address").disabled = false;
}

window.getNewStealthAddress = getNewStealthAddress;

//////////////////////////////////////////////////////////////////////////////
//
// SDK Initialization
//
//////////////////////////////////////////////////////////////////////////////

import { CurvySDK } from "@0xcurvy/curvy-sdk";

window.addEventListener("DOMContentLoaded", () => {
  showTabContent("walletsTab");
});

const { apiKey, apiBaseUrl, network } = getSDKConfiguration();

const networkToNetworkFilterMapping = {
  testnets: true,
  mainnets: false,
};

let selectedNetworkFilter;

if (networkToNetworkFilterMapping[network] !== undefined) {
  selectedNetworkFilter = networkToNetworkFilterMapping[network];
} else {
  selectedNetworkFilter = network;
}

window.curvySDK = await CurvySDK.init(apiKey, selectedNetworkFilter, apiBaseUrl);

// Get networks from the SDK
const networks = window.curvySDK.getNetworks();

// Populate the network dropdown
const networkSelect = document.getElementById("sdk-network");

// All Testnets
const testnetOption = document.createElement("option");
testnetOption.value = "testnets";
testnetOption.textContent = "All Testnets";
networkSelect.appendChild(testnetOption);

// All Mainnets
const mainnetOption = document.createElement("option");
mainnetOption.value = "mainnets";
mainnetOption.textContent = "All Mainnets";
networkSelect.appendChild(mainnetOption);

const networkForStealthAddressSelect = document.getElementById("networkForStealthAddress");

if (networks && Array.isArray(networks)) {
  for (const network of networks) {
    const option = document.createElement("option");
    option.value = network.id;
    option.textContent = network.name;
    networkSelect.appendChild(option.cloneNode(true));
    networkForStealthAddressSelect.appendChild(option);
  }
}

// Update the input fields in the DOM (assuming they exist in the document)
document.getElementById("sdk-api-url").value = apiBaseUrl;
document.getElementById("sdk-api-key").value = apiKey;
document.getElementById("sdk-network").value = network;

window.curvySDK.onSyncStarted((event) => {
  document.getElementById("totalAnnouncements").textContent = 0;
  addEventRow("SYNC_STARTED", JSON.stringify(event));
});

window.curvySDK.onSyncProgress((event) => {
  addEventRow("SYNC_PROGRESS", JSON.stringify(event, ["synced", "remaining"]));

  for (const announcement of event.announcements) {
    addAnnouncementRow(announcement);
  }
});

window.curvySDK.onSyncComplete((event) => {
  addEventRow("SYNC_COMPLETE", JSON.stringify(event));
  populateWalletsTree();
});

window.curvySDK.onScanProgress((event) => {
  addEventRow("SCAN_PROGRESS", JSON.stringify(event));
});

let totalMatched = 0;
window.curvySDK.onScanComplete((event) => {
  totalMatched += event.matched;
  document.getElementById("totalStealthAddresses").textContent = totalMatched;

  addEventRow("SCAN_COMPLETE", JSON.stringify(event));
});
