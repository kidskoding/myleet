def number_of_steps(num: int) -> int:
    if num == 0:
        return 0
    return num.bit_length() + bin(num).count("1") - 1
