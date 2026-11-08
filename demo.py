def is_fibonacci(number: int) -> bool:
	if number < 0:
		return False

	previous, current = 0, 1
	while previous < number:
		previous, current = current, previous + current

	return previous == number


try:
	value = int(input("请输入一个整数："))
except ValueError:
	print("输入无效，请输入整数。")
else:
	if is_fibonacci(value):
		print(f"{value} 是斐波那契数。")
	else:
		print(f"{value} 不是斐波那契数。")
print("程序结束。")