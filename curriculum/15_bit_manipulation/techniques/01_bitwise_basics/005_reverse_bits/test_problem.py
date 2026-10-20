from solution import reverse_bits


def test_reverse_bits_all_zero():
    assert reverse_bits(0) == 0


def test_reverse_bits_all_ones():
    assert reverse_bits(0xFFFFFFFF) == 0xFFFFFFFF


def test_reverse_bits_normal():
    assert reverse_bits(0b00000010100101000001111010011100) == 0b00111001011110000010100101000000
