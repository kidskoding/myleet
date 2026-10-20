from solution import can_place_flowers


def test_can_place_flowers_one_fits():
    assert can_place_flowers([1, 0, 0, 0, 1], 1) is True


def test_can_place_flowers_two_do_not_fit():
    assert can_place_flowers([1, 0, 0, 0, 1], 2) is False
