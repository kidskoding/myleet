from solution import guess_number


def test_guess_number_finds_target():
    def guess(num: int) -> int:
        return 0 if num == 6 else (-1 if num > 6 else 1)

    assert guess_number(10, guess) == 6


def test_guess_number_single_candidate():
    assert guess_number(1, lambda num: 0) == 1


def test_guess_number_at_upper_bound():
    def guess(num: int) -> int:
        return 0 if num == 10 else (-1 if num > 10 else 1)

    assert guess_number(10, guess) == 10
