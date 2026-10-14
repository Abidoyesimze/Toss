export const tossAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "claimKey", type: "address" },
      { name: "amount", type: "uint96" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "claimKey", type: "address" },
      { name: "recipient", type: "address" },
      { name: "fee", type: "uint96" },
      { name: "deadline", type: "uint64" },
      { name: "sig", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "claimKey", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "deposits",
    stateMutability: "view",
    inputs: [{ name: "claimKey", type: "address" }],
    outputs: [
      { name: "sender", type: "address" },
      { name: "amount", type: "uint96" },
      { name: "expiry", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "used",
    stateMutability: "view",
    inputs: [{ name: "claimKey", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  { type: "function", name: "maxFee", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint96" }] },
  { type: "function", name: "minDeposit", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint96" }] },
  { type: "error", name: "KeyAlreadyUsed", inputs: [] },
  { type: "error", name: "InvalidClaimKey", inputs: [] },
  { type: "error", name: "AmountTooSmall", inputs: [] },
  { type: "error", name: "InvalidExpiry", inputs: [] },
  { type: "error", name: "NoDeposit", inputs: [] },
  { type: "error", name: "Expired", inputs: [] },
  { type: "error", name: "DeadlinePassed", inputs: [] },
  { type: "error", name: "FeeTooHigh", inputs: [] },
  { type: "error", name: "InvalidRecipient", inputs: [] },
  { type: "error", name: "InvalidSignature", inputs: [] },
  { type: "error", name: "NotSender", inputs: [] },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
