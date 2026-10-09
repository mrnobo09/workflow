import type { InferSchemaType } from "mongoose";
import { jobSchema } from "../models/job.js";

export type JobRecord = InferSchemaType<typeof jobSchema>;
