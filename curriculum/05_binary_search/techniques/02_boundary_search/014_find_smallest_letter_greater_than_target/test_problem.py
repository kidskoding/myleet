from solution import next_greatest_letter


def test_next_greatest_letter_before_first():
    assert next_greatest_letter(["c", "f", "j"], "a") == "c"


def test_next_greatest_letter_strictly_greater():
    assert next_greatest_letter(["c", "f", "j"], "c") == "f"


def test_next_greatest_letter_wraps_around():
    assert next_greatest_letter(["x", "x", "y", "y"], "z") == "x"
