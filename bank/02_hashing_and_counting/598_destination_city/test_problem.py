from solution import dest_city


def test_dest_city_chain_in_order():
    assert dest_city([["London", "New York"], ["New York", "Lima"], ["Lima", "Sao Paulo"]]) == "Sao Paulo"


def test_dest_city_shuffled_paths():
    assert dest_city([["B", "C"], ["D", "B"], ["C", "A"]]) == "A"


def test_dest_city_single_path():
    assert dest_city([["A", "Z"]]) == "Z"


def test_dest_city_reversed_listing():
    assert dest_city([["c", "d"], ["b", "c"], ["a", "b"]]) == "d"
