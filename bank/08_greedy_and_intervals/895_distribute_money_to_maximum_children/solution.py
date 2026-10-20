def dist_money(money: int, children: int) -> int:
    if money < children:
        return -1
    money -= children
    eights = min(money // 7, children)
    money -= eights * 7
    remaining = children - eights
    if remaining == 0 and money > 0:
        eights -= 1
    elif remaining == 1 and money == 3:
        eights -= 1
    return eights
