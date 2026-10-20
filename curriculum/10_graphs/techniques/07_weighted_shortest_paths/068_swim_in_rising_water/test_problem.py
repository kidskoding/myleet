from solution import swim_in_water


def test_swim_in_water_normal_case():
    assert swim_in_water([[0, 2], [1, 3]]) == 3


def test_swim_in_water_single_cell():
    assert swim_in_water([[0]]) == 0
