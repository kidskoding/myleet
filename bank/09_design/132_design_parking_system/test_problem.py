from solution import ParkingSystem


def test_parking_system_fills_up():
    lot = ParkingSystem(1, 1, 0)
    assert lot.add_car(1) is True
    assert lot.add_car(2) is True
    assert lot.add_car(3) is False
    assert lot.add_car(1) is False


def test_parking_system_no_space_at_all():
    lot = ParkingSystem(0, 0, 0)
    assert lot.add_car(1) is False
    assert lot.add_car(2) is False
    assert lot.add_car(3) is False


def test_parking_system_types_are_independent():
    lot = ParkingSystem(0, 0, 2)
    assert lot.add_car(3) is True
    assert lot.add_car(1) is False
    assert lot.add_car(3) is True
    assert lot.add_car(3) is False


def test_parking_system_many_slots():
    lot = ParkingSystem(3, 0, 0)
    assert [lot.add_car(1) for _ in range(4)] == [True, True, True, False]
