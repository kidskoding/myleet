def angle_clock(hour: int, minutes: int) -> float:
    minute_angle = 6 * minutes
    hour_angle = 30 * (hour % 12) + 0.5 * minutes
    gap = abs(hour_angle - minute_angle)
    return min(gap, 360 - gap)
