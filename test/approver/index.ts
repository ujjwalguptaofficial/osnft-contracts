import { expect } from "chai";
import { IDeployedPayload } from "../interfaces";

export function testApprover(payload: IDeployedPayload) {

    it('isApprover', async () => {
        const tx = await payload.approver.isApprover(payload.deployer.address);
        await expect(tx).equal(false);
    })

    it('add approver', async () => {
        const tx = payload.approver.addApprover(payload.deployer.address);
        await expect(tx).emit(payload.approver, 'ApproverAdded').withArgs(
            payload.deployer.address
        );
    });

    it('add approver other than owner', async () => {
        const tx = payload.approver.connect(payload.signer2).addApprover(payload.deployer.address);

        await expect(tx).revertedWith('Ownable: caller is not the owner')
    });

    it('remove minter', async () => {
        let tx = payload.approver.addApprover(payload.signer2.address);

        await expect(tx).emit(payload.approver, 'ApproverAdded').withArgs(
            payload.signer2.address
        );

        tx = payload.approver.removeApprover(payload.signer2.address);

        await expect(tx).emit(payload.approver, 'ApproverRemoved').withArgs(
            payload.signer2.address
        );

    });

    it('remove minter other than owner', async () => {
        const tx = payload.approver.connect(payload.signer2).removeApprover(payload.deployer.address);

        await expect(tx).revertedWith('Ownable: caller is not the owner')
    });
}
