from solution import basic_calculator_iv


def test_basic_calculator_iv_substitutes_and_folds_constants():
    assert basic_calculator_iv("e + 8 - a + 5", ["e"], [1]) == ["-1*a", "14"]


def test_basic_calculator_iv_multi_letter_variables():
    assert basic_calculator_iv("e - 8 + temperature - pressure", ["e", "temperature"], [1, 12]) == ["-1*pressure", "5"]


def test_basic_calculator_iv_expands_product():
    assert basic_calculator_iv("(e + 8) * (e - 8)", [], []) == ["1*e*e", "-64"]


def test_basic_calculator_iv_everything_cancels():
    assert basic_calculator_iv("7 - 7", [], []) == []


def test_basic_calculator_iv_merges_reordered_monomials():
    assert basic_calculator_iv("a * b * c + b * a * c * 4", [], []) == ["5*a*b*c"]


def test_basic_calculator_iv_cross_terms_cancel():
    assert basic_calculator_iv("(a + b) * (a - b)", [], []) == ["1*a*a", "-1*b*b"]


def test_basic_calculator_iv_fully_evaluated():
    assert basic_calculator_iv("x * y", ["x", "y"], [2, 3]) == ["6"]
