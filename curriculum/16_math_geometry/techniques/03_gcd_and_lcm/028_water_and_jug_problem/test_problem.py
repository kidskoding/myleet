from solution import can_measure_water


def test_can_measure_water_reachable():
    assert can_measure_water(3, 5, 4) is True


def test_can_measure_water_unreachable():
    assert can_measure_water(2, 6, 5) is False


def test_can_measure_water_uses_both_jugs_full():
    assert can_measure_water(1, 2, 3) is True
