from solution import parse_ternary


def test_parse_ternary_simple_true():
    assert parse_ternary("T?2:3") == "2"


def test_parse_ternary_nested_in_false_branch():
    assert parse_ternary("F?1:T?4:5") == "4"


def test_parse_ternary_nested_in_true_branch():
    assert parse_ternary("T?T?F:5:3") == "F"


def test_parse_ternary_boolean_results():
    assert parse_ternary("T?T:F") == "T"
    assert parse_ternary("F?T:F") == "F"


def test_parse_ternary_nested_both_branches():
    assert parse_ternary("F?T?1:2:F?3:4") == "4"


def test_parse_ternary_inner_false():
    assert parse_ternary("T?F?1:2:3") == "2"
