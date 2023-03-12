import { Address, BigInt, Bytes, ethereum, crypto, log, } from "@graphprotocol/graph-ts"
import {
  OSNFT,
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
import { Account, ExampleEntity, Project, ProjectToken } from "../generated/schema"

export function handleApprovalForAll(event: ApprovalForAll): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.account = event.params.account
  entity.operator = event.params.operator

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.balanceOf(...)
  // - contract.balanceOfBatch(...)
  // - contract.getContractEarning(...)
  // - contract.getInvestedAmount(...)
  // - contract.getProject(...)
  // - contract.isApprovedForAll(...)
  // - contract.isPayableToken(...)
  // - contract.isVerifier(...)
  // - contract.mintPrice(...)
  // - contract.owner(...)
  // - contract.supportsInterface(...)
  // - contract.uri(...)
}

export function handleInitialized(event: Initialized): void { }

export function handleOwnershipTransferred(event: OwnershipTransferred): void { }

export function handleProjectTokenize(event: ProjectTokenize): void {
  const params = event.params;

  const project = new Project(event.params.tokenId.toString());
  project.basePrice = params.basePrice;
  project.creator = params.creator;
  project.creatorRoyality = params.royality;
  project.paymentToken = params.paymentToken;
  project.projectUrl = params.projectUrl;
  project.popularityFactorPrice = params.popularityFactorPrice;
  project.tokenCount = BigInt.fromI32(0);
  project.treasuryTotalAmount = BigInt.fromI32(0);
  project.lastMintPrice = BigInt.fromI32(0);

  project.save();
}

export function handleTokenMint(event: TokenMint): void {
  const params = event.params;
  // const nft = OSNFT.bind(event.address);

  const project = Project.load(params.tokenId.toString());
  if (project) {
    project.treasuryTotalAmount = project.treasuryTotalAmount.plus(params.mintPrice);
    project.lastMintPrice = params.mintPrice;
    project.save();
  }
  const projectToken = ProjectToken.load(params.tokenId.toString() + params.to.toHexString());
  if (projectToken) {
    projectToken.mintAmount = params.mintPrice;
    projectToken.fork = params.fork;
    projectToken.star = params.star;
    projectToken.save();
  }

  let user = Account.load(params.to);
  if (user == null) {
    user = new Account(params.to);
    user.tokenCount = BigInt.fromI32(0);
    user.totalInvestedAmount = params.mintPrice;
  }
  else {
    user.totalInvestedAmount = user.totalInvestedAmount.plus(
      params.mintPrice
    );
  }

  user.save();
}

export function handleTransferBatch(event: TransferBatch): void { }

function createNewUser(to: Address): Account {
  let user = Account.load(to);
  if (user == null) {
    user = new Account(to);
    user.totalInvestedAmount = BigInt.fromI32(0);
    user.tokenCount = BigInt.fromI32(0);
  }
  return user;
}

export function handleTransferSingle(event: TransferSingle): void {

  const params = event.params;
  const project = Project.load(params.id.toString());
  if (project) {
    if (!params.to.equals(Address.zero())) {
      project.tokenCount = project.tokenCount.plus(BigInt.fromU32(1));
      // project.tokenCount =1 ;.plus(BigInt.fromI32(1));
      project.save();

      const user = createNewUser(params.to);
      user.tokenCount = user.tokenCount.plus(
        BigInt.fromI32(1)
      );

      user.save();

      const projectToken = new ProjectToken(params.id.toString() + params.to.toHexString());
      projectToken.mintAmount = BigInt.fromI32(0);
      projectToken.star = BigInt.fromI32(1);
      projectToken.fork = BigInt.fromI32(1);
      projectToken.project = project.id;
      projectToken.owner = user.id;

      projectToken.save();


    }
    else {
      const user = createNewUser(params.to);
      user.tokenCount = user.tokenCount.minus(
        BigInt.fromI32(1)
      );
      project.tokenCount = project.tokenCount.minus(BigInt.fromU32(1));
      user.save();
      project.save();
    }
  }
}

export function handleURI(event: URI): void { }

export function handleVerifierAdded(event: VerifierAdded): void { }

export function handleVerifierRemoved(event: VerifierRemoved): void { }
