export const noteDeployerFactoryAbi = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "curvyAggregatorAlphaProxyAddress",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "curvyVaultProxyAddress",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "lifiDiamondAddress",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "bytes",
                "name": "_bridgeData",
                "type": "bytes"
            },
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "ownerHash",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "token",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct CurvyTypes.Note",
                "name": "note",
                "type": "tuple"
            }
        ],
        "name": "bridgeAndDeploy",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "ownerHash",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "token",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct CurvyTypes.Note",
                "name": "note",
                "type": "tuple"
            }
        ],
        "name": "deploy",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "ownerHash",
                "type": "uint256"
            }
        ],
        "name": "getContractAddress",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "ownerHash",
                "type": "uint256"
            }
        ],
        "name": "getCreationCode",
        "outputs": [
            {
                "internalType": "bytes",
                "name": "",
                "type": "bytes"
            }
        ],
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "noteDeployer",
        "outputs": [
            {
                "internalType": "contract INoteDeployer",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;
