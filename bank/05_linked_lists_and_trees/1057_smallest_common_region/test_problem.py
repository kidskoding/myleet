from solution import find_smallest_region

REGIONS = [
    ["Earth", "North America", "South America"],
    ["North America", "United States", "Canada"],
    ["United States", "New York", "Boston"],
    ["Canada", "Ontario", "Quebec"],
    ["South America", "Brazil"],
]


def test_find_smallest_region_across_countries():
    assert find_smallest_region(REGIONS, "Quebec", "New York") == "North America"


def test_find_smallest_region_across_continents():
    assert find_smallest_region(REGIONS, "Canada", "South America") == "Earth"


def test_find_smallest_region_siblings():
    assert find_smallest_region(REGIONS, "New York", "Boston") == "United States"


def test_find_smallest_region_one_contains_other():
    assert find_smallest_region(REGIONS, "United States", "Boston") == "United States"


def test_find_smallest_region_root_involved():
    assert find_smallest_region(REGIONS, "Brazil", "Earth") == "Earth"
