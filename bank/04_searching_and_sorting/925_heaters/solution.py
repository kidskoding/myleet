from bisect import bisect_left


def find_radius(houses: list[int], heaters: list[int]) -> int:
    heaters = sorted(heaters)
    radius = 0
    for house in houses:
        pos = bisect_left(heaters, house)
        nearest = float("inf")
        if pos < len(heaters):
            nearest = heaters[pos] - house
        if pos > 0:
            nearest = min(nearest, house - heaters[pos - 1])
        radius = max(radius, int(nearest))
    return radius
