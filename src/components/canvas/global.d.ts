export {};

type T = Window & typeof globalThis;

declare module 'fabric/fabric-impl' {
	// Common
	class Gif {}
	class Arrow {}
	// Element
	class Iframe {}
	class Chart {}
	class Element {}
	class Video {}
	// Node
	class Node {}
	// Link
	class Link {}
	class CurvedLink {}
	class OrthogonalLink {}
	class Cube {}
	// SVG
	class Svg {}
}

declare global {
	interface Window {
		gifler: any;
	}
}
