class ParkingSystem:
    def __init__(self, big: int, medium: int, small: int) -> None:
        self.slots = [0, big, medium, small]

    def add_car(self, car_type: int) -> bool:
        if self.slots[car_type] == 0:
            return False
        self.slots[car_type] -= 1
        return True
