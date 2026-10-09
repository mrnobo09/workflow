import type { InferSchemaType } from "mongoose";
import { tenantSchema } from "../models/tenant.js";

export type TenantRecord = InferSchemaType<typeof tenantSchema>;
