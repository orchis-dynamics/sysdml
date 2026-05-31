import { useElementBounding } from "@vueuse/core";
import { computed, ref, type Ref } from "vue";

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const ZOOM_IN_FACTOR = 1.1;
const ZOOM_OUT_FACTOR = 0.9;

export function usePanZoom(containerRef: Ref<HTMLElement | null>) {
	const translateX = ref(0);
	const translateY = ref(0);
	const scale = ref(1);

	const transform = computed(
		() =>
			`translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
	);

	const { left, top } = useElementBounding(containerRef);

	let isPanning = false;
	let panStartX = 0;
	let panStartY = 0;

	function onPointerDown(event: PointerEvent): void {
		if (event.button === 0 || event.button === 1) {
			event.preventDefault();
			isPanning = true;
			panStartX = event.clientX - translateX.value;
			panStartY = event.clientY - translateY.value;
			containerRef.value?.setPointerCapture(event.pointerId);
		}
	}

	function onPointerMove(event: PointerEvent): void {
		if (!isPanning) return;
		translateX.value = event.clientX - panStartX;
		translateY.value = event.clientY - panStartY;
	}

	function onPointerUp(event: PointerEvent): void {
		isPanning = false;
		containerRef.value?.releasePointerCapture(event.pointerId);
	}

	function onWheel(event: WheelEvent): void {
		event.preventDefault();
		const cursorX = event.clientX - left.value;
		const cursorY = event.clientY - top.value;

		const zoomFactor = event.deltaY > 0 ? ZOOM_OUT_FACTOR : ZOOM_IN_FACTOR;
		const nextScale = Math.min(
			MAX_SCALE,
			Math.max(MIN_SCALE, scale.value * zoomFactor),
		);

		translateX.value =
			cursorX - (cursorX - translateX.value) * (nextScale / scale.value);
		translateY.value =
			cursorY - (cursorY - translateY.value) * (nextScale / scale.value);
		scale.value = nextScale;
	}

	return {
		translateX,
		translateY,
		scale,
		transform,
		onPointerDown,
		onPointerMove,
		onPointerUp,
		onWheel,
	};
}
