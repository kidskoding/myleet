from solution import maximum_safeness_factor


def test_maximum_safeness_factor_thieves_on_corners():
    assert maximum_safeness_factor([[1, 0, 0], [0, 0, 0], [0, 0, 1]]) == 0


def test_maximum_safeness_factor_single_thief():
    assert maximum_safeness_factor([[0, 0, 1], [0, 0, 0], [0, 0, 0]]) == 2


def test_maximum_safeness_factor_two_thieves():
    assert maximum_safeness_factor([[0, 0, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0], [1, 0, 0, 0]]) == 2


def test_maximum_safeness_factor_one_cell():
    assert maximum_safeness_factor([[1]]) == 0


def test_maximum_safeness_factor_detour_around_center():
    grid = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]
    assert maximum_safeness_factor(grid) == 2
