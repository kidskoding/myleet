from solution import alien_order


def test_alien_order_normal_case():
    assert alien_order(["wrt", "wrf", "er", "ett", "rftt"]) == "wertf"


def test_alien_order_invalid_ordering():
    assert alien_order(["z", "x", "z"]) == ""
