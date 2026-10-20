from solution import minimum_recolors


def test_minimum_recolors_example_one():
    assert minimum_recolors("WBBWWBBWBW", 7) == 3


def test_minimum_recolors_already_present():
    assert minimum_recolors("WBWBBBW", 2) == 0


def test_minimum_recolors_all_white():
    assert minimum_recolors("WWW", 3) == 3


def test_minimum_recolors_single_black():
    assert minimum_recolors("B", 1) == 0


def test_minimum_recolors_alternating():
    assert minimum_recolors("BWBWB", 3) == 1
