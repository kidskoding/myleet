from solution import regions_by_slashes


def test_regions_by_slashes_spaces():
    assert regions_by_slashes([" /", "/ "]) == 2


def test_regions_by_slashes_backslash():
    assert regions_by_slashes([" /", "  "]) == 1


def test_regions_by_slashes_mixed():
    assert regions_by_slashes(["/\\", "\\/"]) == 5


def test_regions_by_slashes_single_space():
    assert regions_by_slashes([" "]) == 1
