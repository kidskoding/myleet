from solution import get_max_grid_happiness


def test_get_max_grid_happiness_example_one():
    assert get_max_grid_happiness(2, 3, 1, 2) == 240


def test_get_max_grid_happiness_example_two():
    assert get_max_grid_happiness(3, 1, 2, 1) == 260


def test_get_max_grid_happiness_all_introverts():
    assert get_max_grid_happiness(2, 2, 4, 0) == 240


def test_get_max_grid_happiness_empty_people():
    assert get_max_grid_happiness(2, 2, 0, 0) == 0
