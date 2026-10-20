from solution import eval_rpn


def test_eval_rpn_addition_subtraction():
    assert eval_rpn(["2", "1", "+", "3", "*"]) == 9


def test_eval_rpn_division_truncates_toward_zero():
    assert eval_rpn(["4", "13", "5", "/", "+"]) == 6


def test_eval_rpn_single_token():
    assert eval_rpn(["42"]) == 42
