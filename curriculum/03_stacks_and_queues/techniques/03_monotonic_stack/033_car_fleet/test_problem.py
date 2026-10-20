from solution import car_fleet


def test_car_fleet_normal():
    assert car_fleet(12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3]) == 3


def test_car_fleet_single_car():
    assert car_fleet(10, [3], [3]) == 1


def test_car_fleet_all_merge():
    assert car_fleet(100, [0, 2, 4], [4, 2, 1]) == 1
