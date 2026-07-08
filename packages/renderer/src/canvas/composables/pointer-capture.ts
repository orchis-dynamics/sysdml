export function capturePointerQuietly(
	element: Element,
	pointerId: number,
): void {
	try {
		element.setPointerCapture(pointerId);
	} catch {
		return;
	}
}

export function releasePointerCaptureQuietly(
	element: Element,
	pointerId: number,
): void {
	try {
		element.releasePointerCapture(pointerId);
	} catch {
		return;
	}
}
