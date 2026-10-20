from solution import min_cost_to_supply_water


def test_min_cost_to_supply_water_normal():
    wells = [1, 2, 2]
    pipes = [[1, 2, 1], [2, 3, 1]]
    assert min_cost_to_supply_water(3, wells, pipes) == 3


def test_min_cost_to_supply_water_no_pipes_needed():
    assert min_cost_to_supply_water(2, [1, 1], []) == 2


def test_min_cost_to_supply_water_single_house():
    assert min_cost_to_supply_water(1, [5], []) == 5
