
import { describe } from "mocha";
import { testApprove } from "./approve";
import { IDeployedPayload } from "../interfaces";
import { testMint } from "./mint";
import { testOwnerOf } from "./owner_of";
import { testProjectMeta } from "./project_meta";
import { runPublicState } from "./public_state";
import { setBaseTokenURI } from "./set_base_token_uri";
import { testTransferFrom } from "./transfer_from";
import { testNFTBurn } from "./burn";
import { expect } from "chai";

export function testNFT(payload: IDeployedPayload) {

    it('call initialize', async () => {
        const tx = payload.nft.initialize('OpenSourceNFT',
            'OSNFT',
            'https://ujjwalnft.com/metadata/',
            payload.approver.address,
            payload.nativeToken.address);
        await expect(tx).revertedWith(`Initializable: contract is already initialized`);
    })

    describe('meta data', () => {
        runPublicState(payload);
    })

    describe('setBaseTokenURI', async () => {
        setBaseTokenURI(payload);
    })

    describe('relayer', () => {
        it('set relayer non admin', async () => {
            const relayer = payload.relayer.address;
            const tx = payload.nft.connect(payload.signer3)["relayer(address)"](relayer);
            await expect(tx).revertedWith(`Ownable: caller is not the owner`);
        })

        it('set relayer success', async () => {
            const relayer = payload.relayer.address;
            await payload.nft["relayer(address)"](relayer);

            const addressFrom = await payload.nft["relayer()"]();

            expect(addressFrom).equal(relayer);
        })
    })

    describe('mint', async () => {
        testMint(payload);
    })

    describe('owner of', async () => {
        testOwnerOf(payload);
    })

    describe('project meta', async () => {
        testProjectMeta(payload);
    })

    describe('approve', async () => {
        testApprove(payload);
    })

    describe('transfer from', async () => {
        testTransferFrom(payload);
    })

    describe('burn', async () => {
        testNFTBurn(payload);
    })
}
