import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  ApprovalForAll,
  Initialized,
  OwnershipTransferred,
  ProjectTokenize,
  TokenMint,
  TransferBatch,
  TransferSingle,
  URI,
  VerifierAdded,
  VerifierRemoved
} from "../generated/OSNFT/OSNFT"

export function createApprovalForAllEvent(
  account: Address,
  operator: Address,
  approved: boolean
): ApprovalForAll {
  let approvalForAllEvent = changetype<ApprovalForAll>(newMockEvent())

  approvalForAllEvent.parameters = new Array()

  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("approved", ethereum.Value.fromBoolean(approved))
  )

  return approvalForAllEvent
}

export function createInitializedEvent(version: i32): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(version))
    )
  )

  return initializedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createProjectTokenizeEvent(
  tokenId: BigInt,
  creator: Address,
  basePrice: BigInt,
  popularityFactorPrice: BigInt,
  paymentToken: Address,
  royality: i32,
  projectUrl: string
): ProjectTokenize {
  let projectTokenizeEvent = changetype<ProjectTokenize>(newMockEvent())

  projectTokenizeEvent.parameters = new Array()

  projectTokenizeEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )
  projectTokenizeEvent.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  )
  projectTokenizeEvent.parameters.push(
    new ethereum.EventParam(
      "basePrice",
      ethereum.Value.fromUnsignedBigInt(basePrice)
    )
  )
  projectTokenizeEvent.parameters.push(
    new ethereum.EventParam(
      "popularityFactorPrice",
      ethereum.Value.fromUnsignedBigInt(popularityFactorPrice)
    )
  )
  projectTokenizeEvent.parameters.push(
    new ethereum.EventParam(
      "paymentToken",
      ethereum.Value.fromAddress(paymentToken)
    )
  )
  projectTokenizeEvent.parameters.push(
    new ethereum.EventParam(
      "royality",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(royality))
    )
  )
  projectTokenizeEvent.parameters.push(
    new ethereum.EventParam("projectUrl", ethereum.Value.fromString(projectUrl))
  )

  return projectTokenizeEvent
}

export function createTokenMintEvent(
  star: BigInt,
  fork: BigInt,
  mintPrice: BigInt
): TokenMint {
  let tokenMintEvent = changetype<TokenMint>(newMockEvent())

  tokenMintEvent.parameters = new Array()

  tokenMintEvent.parameters.push(
    new ethereum.EventParam("star", ethereum.Value.fromUnsignedBigInt(star))
  )
  tokenMintEvent.parameters.push(
    new ethereum.EventParam("fork", ethereum.Value.fromUnsignedBigInt(fork))
  )
  tokenMintEvent.parameters.push(
    new ethereum.EventParam(
      "mintPrice",
      ethereum.Value.fromUnsignedBigInt(mintPrice)
    )
  )

  return tokenMintEvent
}

export function createTransferBatchEvent(
  operator: Address,
  from: Address,
  to: Address,
  ids: Array<BigInt>,
  values: Array<BigInt>
): TransferBatch {
  let transferBatchEvent = changetype<TransferBatch>(newMockEvent())

  transferBatchEvent.parameters = new Array()

  transferBatchEvent.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )
  transferBatchEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  transferBatchEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferBatchEvent.parameters.push(
    new ethereum.EventParam("ids", ethereum.Value.fromUnsignedBigIntArray(ids))
  )
  transferBatchEvent.parameters.push(
    new ethereum.EventParam(
      "values",
      ethereum.Value.fromUnsignedBigIntArray(values)
    )
  )

  return transferBatchEvent
}

export function createTransferSingleEvent(
  operator: Address,
  from: Address,
  to: Address,
  id: BigInt,
  value: BigInt
): TransferSingle {
  let transferSingleEvent = changetype<TransferSingle>(newMockEvent())

  transferSingleEvent.parameters = new Array()

  transferSingleEvent.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )
  transferSingleEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  transferSingleEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferSingleEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  transferSingleEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )

  return transferSingleEvent
}

export function createURIEvent(value: string, id: BigInt): URI {
  let uriEvent = changetype<URI>(newMockEvent())

  uriEvent.parameters = new Array()

  uriEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromString(value))
  )
  uriEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )

  return uriEvent
}

export function createVerifierAddedEvent(account: Address): VerifierAdded {
  let verifierAddedEvent = changetype<VerifierAdded>(newMockEvent())

  verifierAddedEvent.parameters = new Array()

  verifierAddedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return verifierAddedEvent
}

export function createVerifierRemovedEvent(account: Address): VerifierRemoved {
  let verifierRemovedEvent = changetype<VerifierRemoved>(newMockEvent())

  verifierRemovedEvent.parameters = new Array()

  verifierRemovedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return verifierRemovedEvent
}
