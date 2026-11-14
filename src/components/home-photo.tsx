interface HomePhotoProps {
  file: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
}

export function HomePhoto({ file, alt, width, height, sizes }: HomePhotoProps) {
  const source = `/images/home/${file}`;
  const base = source.slice(0, -".webp".length);

  return (
    // The static export serves prebuilt WebP variants directly.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      srcSet={`${base}-360.webp 360w, ${base}-640.webp 640w, ${source} ${width}w`}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
    />
  );
}
