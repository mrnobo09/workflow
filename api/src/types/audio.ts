import type { InferSchemaType } from "mongoose";
import { audioImportSchema } from "../models/audio.js";

export type AudioImportRecord = InferSchemaType<typeof audioImportSchema>;
