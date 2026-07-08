export function capturePointerQuietly(
	element: Element,
	pointerId: number,
): void {
	try {
		element.setPointerCapture(pointerId);
	} catch (error) {
		if (error instanceof DOMException) return;
		throw error;
	}
}
