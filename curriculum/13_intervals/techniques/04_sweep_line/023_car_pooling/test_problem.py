from solution import car_pooling


def test_car_pooling_empty_trips():
    assert car_pooling([], 5) is True


def test_car_pooling_fits_capacity():
    assert car_pooling([[2, 1, 5], [3, 3, 7]], 4) is True


def test_car_pooling_exceeds_capacity():
    assert car_pooling([[2, 1, 5], [3, 3, 7]], 3) is False


def test_car_pooling_dropoff_frees_capacity():
    assert car_pooling([[3, 0, 2], [3, 2, 5]], 3) is True
