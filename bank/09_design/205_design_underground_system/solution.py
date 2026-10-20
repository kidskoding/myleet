class UndergroundSystem:
    def __init__(self) -> None:
        self.open_trips: dict[int, tuple[str, int]] = {}
        self.routes: dict[tuple[str, str], list[int]] = {}

    def check_in(self, id: int, station_name: str, t: int) -> None:
        self.open_trips[id] = (station_name, t)

    def check_out(self, id: int, station_name: str, t: int) -> None:
        start_station, start_time = self.open_trips.pop(id)
        totals = self.routes.setdefault((start_station, station_name), [0, 0])
        totals[0] += t - start_time
        totals[1] += 1

    def get_average_time(self, start_station: str, end_station: str) -> float:
        total, count = self.routes[(start_station, end_station)]
        return total / count
