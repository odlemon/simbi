// @ts-nocheck
import { Router } from "express";
import { LoanPartnerWebhookController } from "../../controllers/webhooks/LoanPartnerWebhookController";

const router = Router();
const controller = new LoanPartnerWebhookController();

router.post("/:partnerSlug/status", (req, res) => controller.partnerStatus(req, res));

export default router;
