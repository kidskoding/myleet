from solution import validate_stack_sequences


def test_validate_stack_sequences_valid():
    assert validate_stack_sequences([1, 2, 3, 4, 5], [4, 5, 3, 2, 1]) is True


def test_validate_stack_sequences_invalid():
    assert validate_stack_sequences([1, 2, 3, 4, 5], [4, 3, 5, 1, 2]) is False
