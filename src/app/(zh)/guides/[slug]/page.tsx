import View from "./view";
export { generateStaticParams, generateMetadata } from "./view";
export const dynamicParams = false;
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <View params={params} />;
}
