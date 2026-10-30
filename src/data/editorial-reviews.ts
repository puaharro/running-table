import records from "./editorial-reviews.json";
import { assertEditorialReviews, type EditorialReview } from "@/lib/editorial-reviews";
const input: unknown = records;
assertEditorialReviews(input);
export const editorialReviews: EditorialReview[] = input;
