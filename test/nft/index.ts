
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

export function testNFT(payload: IDeployedPayload) {


    describe('meta data', () => {
        runPublicState(payload);
    })

    describe('setBaseTokenURI', async () => {
        setBaseTokenURI(payload);
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
