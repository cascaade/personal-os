export interface Point {
    x: number;
    y: number;
}

export function rayCircleHitAngle(
    origin: Point,
    angleRad: number,
    radius: number
): number | null {
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);

    // Quadratic coefficients: A*t^2 + B*t + C = 0
    const A = dx * dx + dy * dy; // always 1 since (dx,dy) is a unit vector
    const B = 2 * ( origin.x * dx + origin.y * dy );
    const C = origin.x * origin.x + origin.y * origin.y - radius * radius;

    const discriminant = B * B - 4 * A * C;
    if (discriminant < 0) return null; // ray never reaches the circle

    const t = ( -B + Math.sqrt(discriminant) ) / ( 2 * A );
    if (t < 0) return null; // circle is entirely behind the ray

    const hitX = origin.x + t * dx;
    const hitY = origin.y + t * dy;

    return Math.atan2(hitY, hitX); // angle from center to the hit point
}

export function offsetHitAngle(
    hitAngle: number,
    offset: number,
    radius: number,
    center: Point
): Point {
    return {
        x: center.x + Math.cos(hitAngle + offset) * radius,
        y: center.y + Math.sin(hitAngle + offset) * radius
    };
}
