from solution import fizz_buzz


def test_fizz_buzz_one():
    assert fizz_buzz(1) == ["1"]


def test_fizz_buzz_three():
    assert fizz_buzz(3) == ["1", "2", "Fizz"]


def test_fizz_buzz_five():
    assert fizz_buzz(5) == ["1", "2", "Fizz", "4", "Buzz"]


def test_fizz_buzz_fifteen():
    assert fizz_buzz(15) == [
        "1",
        "2",
        "Fizz",
        "4",
        "Buzz",
        "Fizz",
        "7",
        "8",
        "Fizz",
        "Buzz",
        "11",
        "Fizz",
        "13",
        "14",
        "FizzBuzz",
    ]
