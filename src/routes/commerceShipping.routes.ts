// @ts-nocheck
import { Router } from "express";
import { CommercePublicController } from "../controllers/public/CommercePublicController";

const router = Router();
const controller = new CommercePublicController();

router.get("/shipping-config", (req, res) => controller.getShippingConfig(req, res));

export default router;
