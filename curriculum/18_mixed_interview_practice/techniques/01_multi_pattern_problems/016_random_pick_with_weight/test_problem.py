from solution import WeightedRandomPicker


def test_weighted_random_picker_single_weight():
    picker = WeightedRandomPicker([1])

    assert all(picker.pick_index() == 0 for _ in range(50))


def test_weighted_random_picker_respects_weights():
    picker = WeightedRandomPicker([1, 3])
    draws = [picker.pick_index() for _ in range(20000)]

    assert set(draws) == {0, 1}
    assert 0.70 < draws.count(1) / len(draws) < 0.80
