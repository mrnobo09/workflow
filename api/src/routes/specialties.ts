import { Router } from "express";
import { requireAccount } from "../middleware/requireAccount.js";
import { SPECIALTIES, SPECIALTY_DEFINITIONS } from "../schemas/specialties.js";

const specialtiesRouter = Router();

specialtiesRouter.get("/", requireAccount, (_req, res) => {
    return res.json({
        specialties: SPECIALTIES.map((value) => ({
            value,
            label: SPECIALTY_DEFINITIONS[value].label,
            covers: SPECIALTY_DEFINITIONS[value].covers,
        })),
    });
});

export default specialtiesRouter;
