from solution import minimize_error


def test_minimize_error_mixed_rounding():
    assert minimize_error(["0.700", "2.800", "4.900"], 8) == "1.000"


def test_minimize_error_target_too_high():
    assert minimize_error(["1.500", "2.500", "3.500"], 10) == "-1"


def test_minimize_error_halves():
    assert minimize_error(["1.500", "2.500", "3.500"], 9) == "1.500"


def test_minimize_error_integers_exact():
    assert minimize_error(["1.000", "2.000"], 3) == "0.000"


def test_minimize_error_integers_cannot_move():
    assert minimize_error(["1.000"], 2) == "-1"


def test_minimize_error_round_up_largest_fraction():
    assert minimize_error(["0.500", "0.250"], 1) == "0.750"
