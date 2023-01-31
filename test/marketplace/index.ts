import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { describe } from "mocha";
import { IDeployedPayload } from "../interfaces";
import { testNFTAuction } from "./auction_nft";
import { testBidNFTAuction } from "./bid_nft";
import { testNFTBuy } from "./buy_nft";
import { testPayableToken } from "./payable_token";
import { testRefundAuction } from "./refund_auction";
import { testRemoveSale } from "./update_remove_nft_sale";
import { testNFTSale } from "./sell_nft";
import { testWithdrawPayment } from "./withdraw_payment";
import { testSetSellPriority } from "./set_sell_priority";


export function testMarketplace(payload: IDeployedPayload) {

    it('deploy erc20 token1', async () => {
        const contract = await ethers.getContractFactory('MyToken');

        const deployedContract = await upgrades.deployProxy(
            contract, ["MyToken", "MT"], {
            initializer: 'initialize',
        }) as any;
        payload.erc20Token1 = deployedContract;

        await payload.erc20Token1.mint(payload.deployer.address, '900000000000000000000');
        await payload.erc20Token1.mint(payload.signer4.address, 900000000000);
        await payload.erc20Token1.mint(payload.signer2.address, 900000000000);
    })

    it('deploy erc20 token 2', async () => {
        const contract = await ethers.getContractFactory('MyToken');

        const deployedContract = await upgrades.deployProxy(
            contract, ["MyToken2", "MT2"], {
            initializer: 'initialize',
        }) as any;
        payload.erc20Token2 = deployedContract;

        await payload.erc20Token2.mint(payload.signer2.address, ethers.constants.MaxUint256);
    })

    it('call marketplace initialize', async () => {
        const tx = payload.marketplace.initialize(payload.nft.address, payload.nativeToken.address);
        await expect(tx).revertedWith(`Initializable: contract is already initialized`);
    })

    describe('payable token', () => {
        testPayableToken(payload);
    });

    describe('relayer', () => {
        it('set relayer non admin', async () => {
            const relayer = payload.relayer.address;
            const tx = payload.marketplace.connect(payload.signer3)["relayer(address)"](relayer);
            await expect(tx).revertedWith(`Ownable: caller is not the owner`);
        })

        it('set relayer success', async () => {
            const relayer = payload.relayer.address;
            await payload.marketplace["relayer(address)"](relayer);

            const addressFrom = await payload.marketplace["relayer()"]();

            expect(addressFrom).equal(relayer);
        })
    })

    describe('sale nft', () => {
        testNFTSale(payload);
    });

    describe('buy nft', () => {
        testNFTBuy(payload);
    });

    describe('auction nft', () => {
        testNFTAuction(payload);
    });


    describe('bid nft', () => {
        testBidNFTAuction(payload);
    });


    describe('refund auction nft', () => {
        testRefundAuction(payload);
    });

    describe('withdraw payment', () => {
        testWithdrawPayment(payload);
    });

    describe('set sell priority', () => {
        testSetSellPriority(payload);
    });

    describe('remove sale nft', () => {
        testRemoveSale(payload);
    });

    describe('royality info', async () => {
        it('set marketplace royality by non owner', async () => {
            const marketplace = payload.marketplace;
            const tx = marketplace.connect(payload.signer2).setRoyality(3);

            await expect(tx).to.revertedWith('Ownable: caller is not the owner')
        })

        it('set marketplace royality', async () => {
            const marketplace = payload.marketplace;
            const royality = await marketplace.getRoyality();
            expect(royality).equal(2);

            const tx = await marketplace.setRoyality(3);

            const royalityAfterSet = await marketplace.getRoyality();
            expect(royalityAfterSet).equal(3);


        })
    })

    describe("check jsstore shares owner", () => {
        it('check owners', async () => {
            const nft = payload.nft;
            // const tokenId = payload.getProjectId(payload.projects.jsstore);

            // const user1Share = await nft.shareOf(tokenId, payload.deployer.address);
            // const user2Share = await nft.shareOf(tokenId, payload.signer2.address);
            // const user3Share = await nft.shareOf(tokenId, payload.signer3.address);
            // const marketplace = await nft.shareOf(tokenId, payload.marketplace.address);

            // console.log("user1Share", user1Share);
            // console.log("user2Share", user2Share);
            // console.log("user3Share", user3Share);
            // console.log("marketplace", marketplace);

            const owner = await nft.ownerOf(
                payload.getProjectId(payload.projects["mahal-example"])
            );
            console.log("owner of mahal examples", owner, owner.toLowerCase() === payload.deployer.address.toLowerCase());
        })
    })
}
